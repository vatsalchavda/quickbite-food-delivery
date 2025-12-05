import { Container } from 'react-bootstrap';

function Footer() {
  return (
    <footer className="bg-dark text-white mt-5 py-4">
      <Container>
        <div className="text-center">
          <p className="mb-0">&copy; 2025 QuickBite Food Delivery. All rights reserved.</p>
          <small className="text-muted">Built with React, Redux, and Express</small>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
