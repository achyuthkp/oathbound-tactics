import { createRoot } from 'react-dom/client';
import App from './App';
import { ModelSheet } from './components/ModelSheet';
import './styles.css';
import './figure.css';

const root = createRoot(document.getElementById('root')!);
root.render(window.location.hash === '#gallery' ? <ModelSheet /> : <App />);
