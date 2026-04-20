import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p>© 2024 Crypto Launchpad. All rights reserved.</p>
        <p className="text-sm mt-2">
          Disclaimer: This is a demo platform. Always conduct thorough research before investing in any token.
        </p>
      </div>
    </footer>
  );
};
