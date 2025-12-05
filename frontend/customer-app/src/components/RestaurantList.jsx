import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { fetchRestaurants, searchRestaurants, clearSearchResults } from '../store/restaurantSlice';
import { useNavigate } from 'react-router-dom';

function RestaurantList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { restaurants, searchResults, loading, searchLoading, error } = useSelector((state) => state.restaurants);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  useEffect(() => {
    dispatch(fetchRestaurants());
  }, [dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchActive(true);
      dispatch(searchRestaurants(searchQuery));
    } else {
      setIsSearchActive(false);
      dispatch(clearSearchResults());
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchActive(false);
    dispatch(clearSearchResults());
  };

  const displayRestaurants = isSearchActive ? searchResults : restaurants;

  return (
    <Container className="py-4">
      <h1 className="mb-4">Browse Restaurants</h1>

      {/* Search Bar */}
      <Form onSubmit={handleSearch} className="mb-4">
        <Row>
          <Col md={10}>
            <Form.Control
              type="text"
              placeholder="Search restaurants by name, cuisine, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col md={2}>
            <Button type="submit" variant="primary" className="w-100" disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search'}
            </Button>
          </Col>
        </Row>
      </Form>

      {isSearchActive && (
        <div className="mb-3">
          <Button variant="secondary" size="sm" onClick={handleClearSearch}>
            Clear Search
          </Button>
          <span className="ms-3 text-muted">
            Found {displayRestaurants.length} restaurant{displayRestaurants.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <Row>
          {displayRestaurants.length === 0 ? (
            <Col>
              <Alert variant="info">No restaurants found.</Alert>
            </Col>
          ) : (
            displayRestaurants.map((restaurant) => (
              <Col key={restaurant._id} md={6} lg={4} className="mb-4">
                <Card className="h-100">
                  <Card.Body>
                    <Card.Title>{restaurant.name}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                      {restaurant.cuisine}
                    </Card.Subtitle>
                    <Card.Text>
                      {restaurant.description?.substring(0, 100)}
                      {restaurant.description?.length > 100 && '...'}
                    </Card.Text>
                    <div className="mb-2">
                      <small className="text-muted">
                        ⭐ {restaurant.rating?.average?.toFixed(1) || 'N/A'} ({restaurant.rating?.count || 0} reviews) | 
                        📍 {restaurant.address?.city || 'N/A'}
                      </small>
                    </div>
                    {restaurant.isActive ? (
                      <Button 
                        variant="primary" 
                        onClick={() => navigate(`/restaurants/${restaurant._id}`)}
                        className="w-100"
                      >
                        View Menu
                      </Button>
                    ) : (
                      <Button variant="secondary" disabled className="w-100">
                        Closed
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))
          )}
        </Row>
      )}
    </Container>
  );
}

export default RestaurantList;
