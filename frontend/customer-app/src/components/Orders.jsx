import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Card, Badge, ListGroup, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { fetchMyOrders } from '../store/orderSlice';

function Orders() {
  const dispatch = useDispatch();
  const { orders, loading, error } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  const getStatusBadgeVariant = (status) => {
    const variants = {
      PENDING: 'warning',
      CONFIRMED: 'info',
      PREPARING: 'primary',
      OUT_FOR_DELIVERY: 'info',
      DELIVERED: 'success',
      CANCELLED: 'danger',
    };
    return variants[status] || 'secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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

  return (
    <Container className="py-4">
      <h1 className="mb-4">My Orders</h1>

      {error && <Alert variant="danger">{error}</Alert>}

      {orders.length === 0 ? (
        <Alert variant="info">
          You haven't placed any orders yet. <Alert.Link href="/">Start ordering!</Alert.Link>
        </Alert>
      ) : (
        <Row>
          {orders.map((order) => (
            <Col key={order._id} md={12} className="mb-3">
              <Card>
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Order #{order._id.slice(-8)}</strong>
                      <br />
                      <small className="text-muted">{formatDate(order.createdAt)}</small>
                    </div>
                    <Badge bg={getStatusBadgeVariant(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <h6>Items:</h6>
                  <ListGroup variant="flush" className="mb-3">
                    {order.items.map((item, index) => (
                      <ListGroup.Item key={index}>
                        <div className="d-flex justify-content-between">
                          <div>
                            {item.menuItem?.name || 'Item'}
                            <small className="text-muted"> x{item.quantity}</small>
                          </div>
                          <div>${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>

                  <Row>
                    <Col md={6}>
                      <small className="text-muted">
                        <strong>Delivery Address:</strong><br />
                        {order.deliveryAddress.street}<br />
                        {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                      </small>
                    </Col>
                    <Col md={6} className="text-end">
                      <h5>Total: ${order.totalAmount.toFixed(2)}</h5>
                      <small className="text-muted">Payment: {order.paymentMethod}</small>
                    </Col>
                  </Row>

                  {order.specialInstructions && (
                    <div className="mt-2">
                      <small className="text-muted">
                        <strong>Instructions:</strong> {order.specialInstructions}
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default Orders;
