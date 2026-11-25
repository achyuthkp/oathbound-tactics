import { createRoot } from 'react-dom/client';
import App from './App';
import { ModelSheet } from './components/ModelSheet';
import { SpriteBrowser } from './components/SpriteBrowser';
import './styles.css';
import './figure.css';
import { startGamepad } from './gamepad';

const root = createRoot(document.getElementById('root')!);
const render = () => {
  const hash = window.location.hash;
  root.render(hash === '#gallery' ? <ModelSheet /> : hash === '#sprites' ? <SpriteBrowser /> : <App />);
};
render();
startGamepad();
window.addEventListener('hashchange', render);
