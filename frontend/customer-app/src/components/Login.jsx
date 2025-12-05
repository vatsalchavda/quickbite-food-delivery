import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Button, Alert, Container, Card } from 'react-bootstrap';
import { login, clearError } from '../store/authSlice';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(credentials));
    if (result.type === 'auth/login/fulfilled') {
      navigate('/');
    }
  };

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    dispatch(clearError());
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Card style={{ width: '400px' }}>
        <Card.Body>
          <h2 className="text-center mb-4">Login to QuickBite</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                required
                placeholder="Enter email"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                placeholder="Enter password"
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </Form>

          <div className="text-center mt-3">
            Don't have an account? <Link to="/register">Register here</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Login;
