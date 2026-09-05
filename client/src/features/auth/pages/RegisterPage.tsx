import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authApi';

const roleOptions = ['donor', 'patient', 'hospital', 'bloodBank'] as const;

type RegisterForm = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: (typeof roleOptions)[number];
};

const initialState: RegisterForm = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  role: 'patient',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (form.password !== form.confirmPassword) {
      setLoading(false);
      setError('Passwords do not match.');
      return;
    }

    try {
      await registerUser({
        email: form.email,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        role: form.role,
      });

      // Redirect to login with a state flag so LoginPage can show a success message
      navigate('/login', { state: { registered: true }, replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to register user.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: 12 }}>
      <h2>Create account</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <input name="firstName" value={form.firstName} placeholder="First name" onChange={handleChange} />
        <input name="lastName" value={form.lastName} placeholder="Last name" onChange={handleChange} />
        <input name="email" type="email" value={form.email} placeholder="Email" onChange={handleChange} required />
        <input name="password" type="password" value={form.password} placeholder="Password (min 8 chars)" onChange={handleChange} required />
        <input name="confirmPassword" type="password" value={form.confirmPassword} placeholder="Confirm password" onChange={handleChange} required />
        <select name="role" value={form.role} onChange={handleChange}>
          {roleOptions.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Registering…' : 'Register'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
