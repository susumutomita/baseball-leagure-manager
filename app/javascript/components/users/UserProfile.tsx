import React from 'react';

interface UserProfileProps {
  userId: number;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  return (
    <div className="user-profile">
      <h1>User Profile</h1>
      <p>User profile component for ID: {userId}</p>
    </div>
  );
};

export default UserProfile;
