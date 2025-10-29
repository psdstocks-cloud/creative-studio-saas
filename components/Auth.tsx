
import React, { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';
import ForgotPassword from './ForgotPassword';

export type AuthView = 'signIn' | 'signUp' | 'forgotPassword';

interface AuthProps {
    initialView: AuthView;
}

const Auth = ({ initialView }: AuthProps) => {
    const [view, setView] = useState<AuthView>(initialView);

    const renderView = () => {
        switch (view) {
            case 'signUp':
                return <SignUp onSwitchToSignIn={() => setView('signIn')} />;
            case 'forgotPassword':
                return <ForgotPassword onSwitchToSignIn={() => setView('signIn')} />;
            case 'signIn':
            default:
                return (
                    <SignIn
                        onSwitchToSignUp={() => setView('signUp')}
                        onForgotPassword={() => setView('forgotPassword')}
                    />
                );
        }
    };

    return (
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                 <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
                    Creative<span className="text-blue-500">SaaS</span>
                 </h1>
            </div>
            {renderView()}
        </div>
    );
};

export default Auth;
