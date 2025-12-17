import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ReferralContext = createContext();

export const ReferralProvider = ({ children }) => {
  const [referralCode, setReferralCode] = useState('');
  const [referredFriends, setReferredFriends] = useState([]);
  const [bonusEarned, setBonusEarned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const generateReferralCode = (userId) => {
    // Generate a simple referral code based on userId
    return 'VJ' + userId.substring(0, 6).toUpperCase();
  };

  // Load referral data
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@referral_data');
        if (saved) {
          const data = JSON.parse(saved);
          setReferralCode(data.referralCode || '');
          setReferredFriends(data.referredFriends || []);
          setBonusEarned(data.bonusEarned || 0);
        } else {
          // Generate new code
          const code = generateReferralCode('user_' + Math.random().toString(36).substr(2, 9));
          setReferralCode(code);
          await AsyncStorage.setItem('@referral_data', JSON.stringify({
            referralCode: code,
            referredFriends: [],
            bonusEarned: 0,
          }));
        }
      } catch (e) {
        console.error('Failed to load referral data', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Add referred friend
  const addReferredFriend = async (friendName, bonus = 500) => {
    try {
      const newFriend = {
        id: Date.now().toString(),
        name: friendName,
        bonus,
        addedAt: new Date().toISOString(),
        status: 'pending', // pending, completed
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
