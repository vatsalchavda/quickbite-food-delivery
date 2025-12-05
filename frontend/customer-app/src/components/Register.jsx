import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Button, Alert, Container, Card } from 'react-bootstrap';
import { register, clearError } from '../store/authSlice';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(register(formData));
    if (result.type === 'auth/register/fulfilled') {
      navigate('/');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [addressField]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    dispatch(clearError());
  };

  return (
    <Container className="d-flex justify-content-center align-items-center py-5">
      <Card style={{ width: '500px' }}>
        <Card.Body>
          <h2 className="text-center mb-4">Register for QuickBite</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="name">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your name"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
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
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter password"
                minLength={6}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="phone">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="Enter phone number"
              />
            </Form.Group>

            <h5 className="mt-4 mb-3">Address</h5>

            <Form.Group className="mb-3" controlId="street">
              <Form.Label>Street</Form.Label>
              <Form.Control
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                required
                placeholder="Enter street address"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="city">
              <Form.Label>City</Form.Label>
              <Form.Control
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                required
                placeholder="Enter city"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="state">
              <Form.Label>State</Form.Label>
              <Form.Control
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                required
                placeholder="Enter state"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="zipCode">
              <Form.Label>Zip Code</Form.Label>
              <Form.Control
                type="text"
                name="address.zipCode"
                value={formData.address.zipCode}
                onChange={handleChange}
                required
                placeholder="Enter zip code"
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </Form>

          <div className="text-center mt-3">
            Already have an account? <Link to="/login">Login here</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Register;
