import { useState } from 'react';
import { Login } from './screens/Login';
import { Signup } from './screens/Signup';
import { Forgot } from './screens/Forgot';
import { EmailSent } from './screens/EmailSent';
import { Reset } from './screens/Reset';

type Key = 'login' | 'signup' | 'forgot' | 'sent' | 'reset';

export function AuthRouter() {
  const [screen, setScreen] = useState<Key>('login');
  const [email, setEmail] = useState('');

  switch (screen) {
    case 'login':   return <Login onNav={(k) => setScreen(k)} />;
    case 'signup':  return <Signup onNav={(k) => setScreen(k)} />;
    case 'forgot':  return <Forgot onNav={(k) => setScreen(k)} onSent={(e) => { setEmail(e); setScreen('sent'); }} />;
    case 'sent':    return <EmailSent email={email} onReset={() => setScreen('reset')} onNav={(k) => setScreen(k)} />;
    case 'reset':   return <Reset token="DEMO_TOKEN" onDone={() => setScreen('login')} />;
  }
}
