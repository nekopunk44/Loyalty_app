import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const ReferralContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

export const ReferralProvider = ({ children }) => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referredFriends, setReferredFriends] = useState([]);
  const [bonusEarned, setBonusEarned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Генерирует реферальный код через API при первом входе
  const generateReferralCode = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`${API_URL}/api/referrals/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name || user.email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReferralCode(data.referral.referralCode);
        await AsyncStorage.setItem('@referral_code', data.referral.referralCode);
        return data.referral.referralCode;
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
      // Fallback to local generation
      const localCode = 'REF_' + user.id.substring(0, 4).toUpperCase() + '_' + Date.now();
      setReferralCode(localCode);
      await AsyncStorage.setItem('@referral_code', localCode);
      return localCode;
    }
  };

  // Load referral data
  useEffect(() => {
    (async () => {
      try {
        // Сначала пробуем загрузить из локального хранилища
        const saved = await AsyncStorage.getItem('@referral_data');
        if (saved) {
          const data = JSON.parse(saved);
          setReferralCode(data.referralCode || '');
          setReferredFriends(data.referredFriends || []);
          setBonusEarned(data.bonusEarned || 0);
        }

        // Если есть пользователь, генерируем код если его нет
        if (user?.id) {
          const savedCode = (await AsyncStorage.getItem('@referral_code')) || '';
          let codeToUse = savedCode || referralCode;
          
          // Если кода нет, генерируем
          if (!codeToUse) {
            codeToUse = await generateReferralCode();
          } else {
            setReferralCode(codeToUse);
          }

          // Загружаем информацию с сервера
          const response = await fetch(`${API_URL}/api/referrals/user/${user.id}`);
          if (response.ok) {
            const data = await response.json();
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
        }
      } catch (e) {
        console.error('Failed to load referral data', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.id]);

  // Применить реферальный код при регистрации
  const applyReferralCode = async (code, newUserId, newUserEmail) => {
    try {
      const response = await fetch(`${API_URL}/api/referrals/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: code,
          newUserId,
          newUserEmail,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, bonus: data.bonus };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Error applying referral code:', error);
      return { success: false, error: error.message };
    }
  };

  // Add referred friend locally
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

  // Mark friend as completed
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
