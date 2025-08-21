import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ResendVerificationModal from './ResendVerificationModal';

interface EmailVerificationPanelProps {
  email: string;
  onBack: () => void;
}

const EmailVerificationPanel: React.FC<EmailVerificationPanelProps> = ({
  email,
  onBack
}) => {
  const [showResendModal, setShowResendModal] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white"
            >
              Account Created!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-2 text-sm text-gray-600 dark:text-gray-400"
            >
              We've sent a verification email to <strong className="text-gray-900 dark:text-white">{email}</strong>
            </motion.p>
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 space-y-6"
          >
            {/* Email Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Mail className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Check Your Email
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Look for an email from Prodactivity</li>
                      <li>Check your spam folder if you don't see it</li>
                      <li>Click the "Verify Email Address" button</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Resend Instructions */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RefreshCw className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Didn't Receive the Email?
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>Click the button below to resend the verification email.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 relative z-[9999]">
              <button
                type="button"
                onClick={() => setShowResendModal(true)}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 z-[10000]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Resend Verification Email
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 z-[10000]"
              >
                Go to Login Page
              </button>

              <button
                type="button"
                onClick={onBack}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 z-[10000]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Registration
              </button>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Need help? Contact our support team
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Resend Verification Modal */}
      <ResendVerificationModal
        isOpen={showResendModal}
        onClose={() => setShowResendModal(false)}
        email={email}
      />
    </div>
  );
};

export default EmailVerificationPanel;
