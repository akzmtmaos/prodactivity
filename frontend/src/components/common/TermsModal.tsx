import React, { useEffect, useState } from 'react';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ open, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      fetch('http://192.168.68.162:8000/api/terms/latest/')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch Terms and Conditions');
          return res.json();
        })
        .then(data => {
          setContent(data.content || getDefaultTerms());
        })
        .catch(() => {
          setContent(getDefaultTerms());
          setError(null);
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  const getDefaultTerms = (): string => {
    return `PRODACTIVITY TERMS AND CONDITIONS

1. ACCEPTANCE OF TERMS
By accessing and using ProdActivity, you accept and agree to be bound by the terms and provision of this agreement.

2. SYSTEM PROTOCOLS AND USAGE
- Users must provide accurate and truthful information during registration
- Username limited to 50 characters maximum
- Email addresses limited to 50 characters maximum
- Users are responsible for maintaining the confidentiality of their account credentials
- Sharing account credentials is strictly prohibited
- Users must not attempt to gain unauthorized access to other user accounts

3. DATA PRIVACY AND SECURITY
- Personal data is collected and processed in accordance with our Privacy Policy
- User-generated content remains the property of the user
- We implement industry-standard security measures to protect user data
- Users are responsible for the content they create and share
- Inappropriate, harmful, or illegal content is strictly prohibited

4. USER RESPONSIBILITIES
- Users must comply with all applicable laws and regulations
- Users must not use the system for any illegal or unauthorized purpose
- Users must not interfere with or disrupt the system's functionality
- Users must report any security vulnerabilities or suspicious activities
- Users must respect intellectual property rights of others

5. SYSTEM MAINTENANCE AND AVAILABILITY
- We strive to maintain 99.9% system availability
- Scheduled maintenance will be communicated in advance
- Emergency maintenance may be performed without prior notice
- We are not liable for temporary service interruptions

6. LIMITATION OF LIABILITY
- ProdActivity is provided "as is" without warranties
- We are not liable for any indirect, incidental, or consequential damages
- Our liability is limited to the amount paid for the service

7. TERMINATION
- We reserve the right to terminate accounts for violations of these terms
- Users may terminate their account at any time
- Upon termination, user data will be handled according to our data retention policy

8. CHANGES TO TERMS
- We may update these terms from time to time
- Users will be notified of significant changes
- Continued use constitutes acceptance of updated terms

9. CONTACT INFORMATION
For questions about these terms, contact us at support@prodactivity.com

Last updated: ${new Date().toLocaleDateString()}`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">Terms and Conditions</h2>
          <button
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              Loading Terms and Conditions...
            </div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-400 text-center py-8">
              {error}
            </div>
          ) : (
            <div className="prose prose-indigo dark:prose-invert max-w-none" style={{ whiteSpace: 'pre-wrap' }}>
              {content}
            </div>
          )}
        </div>
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal; 