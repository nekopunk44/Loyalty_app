import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { apiCall } from '../utils/api';
import { getApiUrl } from '../utils/apiUrl';

const ReferralContext = createContext();

export const ReferralProvider = ({ children }) => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referredFriends, setReferredFriends] = useState([]);
  const [bonusEarned, setBonusEarned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const generateReferralCode = async () => {
    if (!user?.id) return;

    try {
      const data = await apiCall(`${getApiUrl()}/referrals/generate`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          userName: user.name || user.email,
        }),
      });

      if (data.referral?.referralCode) {
        setReferralCode(data.referral.referralCode);
        await AsyncStorage.setItem('@referral_code', data.referral.referralCode);
        return data.referral.referralCode;
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
    }

    // Fallback to local generation
    const localCode = 'REF_' + user.id.substring(0, 4).toUpperCase() + '_' + Date.now();
    setReferralCode(localCode);
    await AsyncStorage.setItem('@referral_code', localCode);
    return localCode;
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@referral_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          setReferralCode(parsed.referralCode || '');
          setReferredFriends(parsed.referredFriends || []);
          setBonusEarned(parsed.bonusEarned || 0);
        }

        if (user?.id) {
          const savedCode = (await AsyncStorage.getItem('@referral_code')) || '';
          let codeToUse = savedCode || referralCode;

          if (!codeToUse) {
            codeToUse = await generateReferralCode();
          } else {
            setReferralCode(codeToUse);
          }

          const data = await apiCall(`${getApiUrl()}/referrals/user/${user.id}`);

          if (data.success) {
            setBonusEarned(data.stats.totalBonus);
            const referralData = {
              referralCode: codeToUse,
              referredFriends: data.referral ? [data.referral] : [],
              bonusEarned: data.stats.totalBonus,
            };
            await AsyncStorage.setItem('@referral_data', JSON.stringify(referralData));
          }
        }
      } catch (e) {
        console.error('ReferralContext: Failed to load referral data', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.id, user?.role]);

  const applyReferralCode = async (code, newUserId, newUserEmail) => {
    try {
      const data = await apiCall(`${getApiUrl()}/referrals/apply`, {
        method: 'POST',
        body: JSON.stringify({ referralCode: code, newUserId, newUserEmail }),
      });

      if (data.error) return { success: false, error: data.error };
      return { success: true, bonus: data.bonus };
    } catch (error) {
      console.error('Error applying referral code:', error);
      return { success: false, error: error.message };
    }
  };

  const addReferredFriend = async (friendName, bonus = 500) => {
    try {
      const newFriend = {
        id: Date.now().toString(),
        name: friendName,
        bonus,
        addedAt: new Date().toISOString(),
        status: 'pending',
      };

      const updatedFriends = [newFriend, ...referredFriends];
      const newBonus = bonusEarned + bonus;

      setReferredFriends(updatedFriends);
      setBonusEarned(newBonus);

      await AsyncStorage.setItem('@referral_data', JSON.stringify({
        referralCode,
        referredFriends: updatedFriends,
        bonusEarned: newBonus,
      }));

      return newFriend;
    } catch (e) {
      console.error('Failed to add referred friend', e);
    }
  };

  const completeFriendReferral = async (friendId) => {
    try {
      const updated = referredFriends.map(f =>
        f.id === friendId ? { ...f, status: 'completed' } : f
      );
      setReferredFriends(updated);

      await AsyncStorage.setItem('@referral_data', JSON.stringify({
        referralCode,
        referredFriends: updated,
        bonusEarned,
      }));
    } catch (e) {
      console.error('Failed to complete referral', e);
    }
  };

  return (
    <ReferralContext.Provider value={{
      referralCode,
      referredFriends,
      bonusEarned,
      isLoading,
      generateReferralCode,
      applyReferralCode,
      addReferredFriend,
      completeFriendReferral,
    }}>
      {children}
    </ReferralContext.Provider>
  );
};

export const useReferral = () => {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferral must be used within ReferralProvider');
  }
  return context;
};
