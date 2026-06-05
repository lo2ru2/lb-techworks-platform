import { useSearchParams } from 'react-router-dom';
import { CustomerAuthForms } from '../auth/CustomerAuthForms';

export function LoginPage() {
  const [params] = useSearchParams();
  const initialMode = params.get('mode') === 'register' ? 'register' : 'login';

  return (
    <>
      <section id="page-header6" className="about-header" />
      <section className="section-p1" style={{ display: 'flex', justifyContent: 'center' }}>
        <CustomerAuthForms variant="page" initialMode={initialMode} />
      </section>
    </>
  );
}
