import { Navigate } from 'react-router-dom';

/** Si login.php: regjistrimi hapet nga e njëjta faqe me kalim te forma e regjistrimit. */
export function RegisterPage() {
  return <Navigate to="/login?mode=register" replace />;
}
