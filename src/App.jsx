import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import { Shop } from './pages/Placeholders';
import Contact from './pages/Contact';
import FieldNotes from './pages/FieldNotes';
import BlogPost from './pages/BlogPost';
import Lab from './pages/Lab';
import { THEMES } from './lib/themes';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <details className="whitespace-pre-wrap">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [themeId, setThemeId] = useState('default');
  const theme = THEMES[themeId];

  return (
    <BrowserRouter>
      <Layout theme={theme} setThemeId={setThemeId}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home theme={theme} />} />
            <Route path="/about" element={<About theme={theme} />} />
            <Route path="/fieldnotes" element={<FieldNotes theme={theme} />} />
            <Route path="/fieldnotes/:slug" element={<BlogPost theme={theme} />} />
            <Route path="/lab" element={<Lab theme={theme} />} />
            <Route path="/shop" element={<Shop theme={theme} />} />
            <Route path="/contact" element={<Contact theme={theme} />} />
          </Routes>
        </ErrorBoundary>
      </Layout>
    </BrowserRouter>
  );
}
