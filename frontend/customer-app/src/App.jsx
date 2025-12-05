import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import Header from './components/Header';
import Footer from './components/Footer';
import RestaurantList from './components/RestaurantList';
import RestaurantDetail from './components/RestaurantDetail';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="d-flex flex-column min-vh-100">
          <Header />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<RestaurantList />} />
              <Route path="/restaurants/:id" element={<RestaurantDetail />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </Provider>
  );
}

export default App;
