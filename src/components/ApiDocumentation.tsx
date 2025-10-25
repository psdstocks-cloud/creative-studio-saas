
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface CodeBlockProps {
  children: React.ReactNode;
  language?: string;
}

const CodeBlock = ({ children }: CodeBlockProps) => (
  <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-left" dir="ltr">
    <code className="text-sm text-gray-800 dark:text-gray-200">
      {children}
    </code>
  </pre>
);

const ApiDocumentation = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('apiDocsTitle')}</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">{t('apiDocsSubtitle')}</p>

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold border-b-2 border-blue-500 pb-2 mb-4">{t('authentication')}</h2>
          <p className="mb-4">{t('authDesc')}</p>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
             <h3 className="font-semibold mb-2">{t('method1')}</h3>
             <CodeBlock>
                <span className="text-green-500">GET</span> https://nehtw.com/api/me?apikey=<span className="text-red-400">{'{your_api_key}'}</span>
             </CodeBlock>
             <h3 className="font-semibold mt-6 mb-2">{t('method2')} <span className="text-xs bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-300 font-bold py-1 px-2 rounded-full ms-2">{t('recommended')}</span></h3>
             <CodeBlock>
                X-Api-Key: <span className="text-red-400">{'{your_api_key}'}</span>
             </CodeBlock>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold border-b-2 border-blue-500 pb-2 mb-4">{t('stockDownloadManage')}</h2>
          <p className="mb-4">{t('stockDownloadManageDesc')}</p>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
             <h3 className="text-xl font-bold">{t('step1')}</h3>
             <p>{t('step1Desc')}</p>
             <CodeBlock>
                <span className="text-green-500">GET</span> https://nehtw.com/api/stockinfo/<span className="text-purple-400">{'{site}'}</span>/<span className="text-purple-400">{'{id}'}</span>
             </CodeBlock>
             <h3 className="text-xl font-bold mt-4">{t('step2')}</h3>
             <p>{t('step2Desc')}</p>
             <CodeBlock>
                <span className="text-green-500">GET</span> https://nehtw.com/api/stockorder/<span className="text-purple-400">{'{site}'}</span>/<span className="text-purple-400">{'{id}'}</span>
             </CodeBlock>
             <h3 className="text-xl font-bold mt-4">{t('step3')}</h3>
             <p>{t('step3Desc')}</p>
             <CodeBlock>
                <span className="text-green-500">GET</span> https://nehtw.com/api/order/<span className="text-purple-400">{'{task_id}'}</span>/status
             </CodeBlock>
             <h3 className="text-xl font-bold mt-4">{t('step4')}</h3>
             <p>{t('step4Desc')}</p>
             <CodeBlock>
                <span className="text-green-500">GET</span> https://nehtw.com/api/v2/order/<span className="text-purple-400">{'{task_id}'}</span>/download
             </CodeBlock>
          </div>
        </section>

         <section>
          <h2 className="text-2xl font-semibold border-b-2 border-blue-500 pb-2 mb-4">{t('manageAccount')}</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
             <h3 className="font-semibold mb-2">{t('getBalance')}</h3>
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('getBalanceDesc')}</p>
             <CodeBlock>
                <span className="text-green-500">GET</span> https://nehtw.com/api/me
             </CodeBlock>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ApiDocumentation;
