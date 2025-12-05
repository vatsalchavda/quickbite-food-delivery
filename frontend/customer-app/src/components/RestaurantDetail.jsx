import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge, ListGroup } from 'react-bootstrap';
import { fetchRestaurantById } from '../store/restaurantSlice';
import { addToCart } from '../store/orderSlice';

function RestaurantDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { selectedRestaurant, loading, error } = useSelector((state) => state.restaurants);
  const { cart } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchRestaurantById(id));
  }, [dispatch, id]);

  const handleAddToCart = (item) => {
    dispatch(addToCart(item));
  };

  const getItemQuantityInCart = (itemId) => {
    const cartItem = cart.find((item) => item._id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  if (!selectedRestaurant) {
    return (
      <Container className="py-4">
        <Alert variant="warning">Restaurant not found.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Restaurant Header */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={8}>
              <h1>{selectedRestaurant.name}</h1>
              <p className="text-muted">{selectedRestaurant.description}</p>
              <div>
                <Badge bg="info" className="me-2">{selectedRestaurant.cuisine}</Badge>
                <Badge bg={selectedRestaurant.isActive ? 'success' : 'secondary'}>
                  {selectedRestaurant.isActive ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <div className="mt-3">
                <small className="text-muted">
                  ⭐ Rating: {selectedRestaurant.rating?.average?.toFixed(1) || 'N/A'} ({selectedRestaurant.rating?.count || 0} reviews)<br />
                  📍 {selectedRestaurant.address?.street}, {selectedRestaurant.address?.city}, {selectedRestaurant.address?.state}<br />
                  📞 {selectedRestaurant.contactNumber}
                </small>
              </div>
            </Col>
            <Col md={4} className="text-end">
              <div className="mt-3">
                <h5>Cart Items: {cart.length}</h5>
                {cart.length > 0 && (
                  <Button variant="success" href="#cart-section">
                    View Cart
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Menu */}
      <h2 className="mb-3">Menu</h2>
      {selectedRestaurant.menu && selectedRestaurant.menu.length > 0 ? (
        <Row>
          {selectedRestaurant.menu.map((item) => (
            <Col key={item._id} md={6} lg={4} className="mb-3">
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <Card.Title>{item.name}</Card.Title>
                      {item.isVegetarian && <Badge bg="success">Veg</Badge>}
                    </div>
                    <h5 className="text-primary">${item.price.toFixed(2)}</h5>
                  </div>
                  <Card.Text className="text-muted small">
                    {item.description}
                  </Card.Text>
                  {item.isAvailable ? (
                    <div className="d-flex justify-content-between align-items-center">
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => handleAddToCart(item)}
                      >
                        Add to Cart
                      </Button>
                      {getItemQuantityInCart(item._id) > 0 && (
                        <Badge bg="secondary">
                          In cart: {getItemQuantityInCart(item._id)}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Button variant="secondary" size="sm" disabled>
                      Not Available
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Alert variant="info">No menu items available.</Alert>
      )}

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div id="cart-section" className="mt-5">
          <h3 className="mb-3">Your Cart</h3>
          <Card>
            <ListGroup variant="flush">
              {cart.map((item) => (
                <ListGroup.Item key={item._id}>
                  <Row>
                    <Col md={6}>
                      <strong>{item.name}</strong>
                    </Col>
                    <Col md={2}>Qty: {item.quantity}</Col>
                    <Col md={2}>${(item.price * item.quantity).toFixed(2)}</Col>
                    <Col md={2}>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => dispatch({ type: 'orders/removeFromCart', payload: item._id })}
                      >
                        Remove
                      </Button>
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
              <ListGroup.Item>
                <Row>
                  <Col md={8} className="text-end"><strong>Total:</strong></Col>
                  <Col md={4}>
                    <strong>
                      ${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                    </strong>
                  </Col>
                </Row>
              </ListGroup.Item>
            </ListGroup>
            <Card.Body>
              <Button 
                variant="success" 
                className="w-100"
                href="/checkout"
              >
                Proceed to Checkout
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}
    </Container>
  );
}

export default RestaurantDetail;
