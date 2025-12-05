import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Container, Card, ListGroup, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { createOrder, clearCart } from '../store/orderSlice';

function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart, loading, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
  });
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    // Get restaurant ID from first cart item (all items should be from same restaurant)
    const restaurantId = cart[0].restaurantId || cart[0].restaurant?._id;

    const orderData = {
      restaurantId,
      items: cart.map(item => ({
        menuItem: item._id,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: calculateTotal(),
      deliveryAddress,
      paymentMethod,
      specialInstructions: specialInstructions || undefined,
    };

    const result = await dispatch(createOrder(orderData));
    
    if (result.type === 'orders/create/fulfilled') {
      alert('Order placed successfully!');
      dispatch(clearCart());
      navigate('/orders');
    }
  };

  if (cart.length === 0) {
    return (
      <Container className="py-4">
        <Alert variant="info">
          Your cart is empty. <Alert.Link href="/">Browse restaurants</Alert.Link>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">Checkout</h1>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={7}>
          {/* Delivery Address */}
          <Card className="mb-4">
            <Card.Header><h5>Delivery Address</h5></Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Street</Form.Label>
                  <Form.Control
                    type="text"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                    required
                  />
                </Form.Group>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>City</Form.Label>
                      <Form.Control
                        type="text"
                        value={deliveryAddress.city}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>State</Form.Label>
                      <Form.Control
                        type="text"
                        value={deliveryAddress.state}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Zip Code</Form.Label>
                      <Form.Control
                        type="text"
                        value={deliveryAddress.zipCode}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, zipCode: e.target.value})}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>

          {/* Payment Method */}
          <Card className="mb-4">
            <Card.Header><h5>Payment Method</h5></Card.Header>
            <Card.Body>
              <Form.Check
                type="radio"
                label="Cash on Delivery"
                name="paymentMethod"
                value="CASH"
                checked={paymentMethod === 'CASH'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                label="Credit/Debit Card"
                name="paymentMethod"
                value="CARD"
                checked={paymentMethod === 'CARD'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                label="Digital Wallet"
                name="paymentMethod"
                value="WALLET"
                checked={paymentMethod === 'WALLET'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </Card.Body>
          </Card>

          {/* Special Instructions */}
          <Card className="mb-4">
            <Card.Header><h5>Special Instructions</h5></Card.Header>
            <Card.Body>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Any special requests for your order..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col md={5}>
          {/* Order Summary */}
          <Card>
            <Card.Header><h5>Order Summary</h5></Card.Header>
            <ListGroup variant="flush">
              {cart.map((item) => (
                <ListGroup.Item key={item._id}>
                  <div className="d-flex justify-content-between">
                    <div>
                      <div>{item.name}</div>
                      <small className="text-muted">Qty: {item.quantity}</small>
                    </div>
                    <div>${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                </ListGroup.Item>
              ))}
              <ListGroup.Item>
                <div className="d-flex justify-content-between">
                  <strong>Subtotal</strong>
                  <strong>${calculateTotal().toFixed(2)}</strong>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                <div className="d-flex justify-content-between">
                  <div>Delivery Fee</div>
                  <div>$2.99</div>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                <div className="d-flex justify-content-between">
                  <div>Tax (8%)</div>
                  <div>${(calculateTotal() * 0.08).toFixed(2)}</div>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                <div className="d-flex justify-content-between">
                  <strong>Total</strong>
                  <strong className="text-primary">
                    ${(calculateTotal() + 2.99 + (calculateTotal() * 0.08)).toFixed(2)}
                  </strong>
                </div>
              </ListGroup.Item>
            </ListGroup>
            <Card.Body>
              <Button 
                variant="success" 
                className="w-100"
                onClick={handlePlaceOrder}
                disabled={loading}
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Checkout;
