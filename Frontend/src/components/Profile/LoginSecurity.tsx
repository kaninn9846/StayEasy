import { Lock, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { changePassword } from '../../services/api';

const LoginSecurity = () => {
  const [isChanging, setIsChanging] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    // Simple validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('Please fill all fields.');
      setMessageType('error');
      return;
    }
    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters long.');
      setMessageType('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      });
      setMessage('Password changed successfully!');
      setMessageType('success');
      setIsChanging(false);
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to change password.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 min-h-[400px]">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-[#A989C8]/10 rounded-xl flex items-center justify-center text-[#A989C8]">
          <Lock size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Login & Security</h2>
          <p className="text-gray-500 text-sm">Manage your password and security settings</p>
        </div>
      </div>

      <div className="border-t border-gray-100 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Password</h3>
            <p className="text-gray-400 text-sm mt-1">Last changed 3 months ago</p>
          </div>
          <button
            className="px-6 py-2.5 bg-[#A989C8] text-white rounded-xl text-sm font-medium hover:bg-[#9676b5] transition-colors shadow-md shadow-[#A989C8]/20"
            onClick={() => setIsChanging(!isChanging)}
          >
            {isChanging ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {isChanging && (
          <div className="mt-6 space-y-4">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl disabled:opacity-50"
            />
            <input
              type="password"
              placeholder="New Password (minimum 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl disabled:opacity-50"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl disabled:opacity-50"
            />
            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                messageType === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <AlertCircle size={16} />
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}
            <button
              className="w-full px-6 py-2.5 bg-[#A989C8] text-white rounded-xl text-sm font-medium hover:bg-[#9676b5] transition-colors shadow-md shadow-[#A989C8]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleChangePassword}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginSecurity;
