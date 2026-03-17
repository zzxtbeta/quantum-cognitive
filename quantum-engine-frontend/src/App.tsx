import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import SignalFeed from './pages/SignalFeed';
import KnowledgeMap from './pages/KnowledgeMap';
import Candidates from './pages/Candidates';
import Researchers from './pages/Researchers';
import MyFocus from './pages/MyFocus';
import MyNotes from './pages/MyNotes';
import Chat from './pages/Chat';
import ToolLogs from './pages/ToolLogs';
import Knowledge from './pages/Knowledge';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <LayoutProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/home" replace />} />
                <Route path="home" element={<Home />} />
                <Route path="signals" element={<SignalFeed />} />
                <Route path="candidates" element={<Candidates />} />
                <Route path="researchers" element={<Researchers />} />
                <Route path="knowledge-map" element={<KnowledgeMap />} />
                <Route path="focus" element={<MyFocus />} />
                <Route path="notes" element={<MyNotes />} />
                <Route path="chat" element={<Chat />} />
                <Route path="tool-logs" element={<ToolLogs />} />
                <Route path="knowledge" element={<Knowledge />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </LayoutProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
