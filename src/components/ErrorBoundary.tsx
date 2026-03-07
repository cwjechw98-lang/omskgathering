import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0a0f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              background: '#1a1a2e',
              border: '1px solid #c9a84c',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '480px',
              textAlign: 'center',
              color: '#e2e8f0',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2
              style={{
                color: '#c9a84c',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
              }}
            >
              {this.props.fallbackTitle ?? 'Произошла ошибка'}
            </h2>
            {this.state.error && (
              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#c9a84c',
                color: '#0a0a0f',
                border: 'none',
                borderRadius: '6px',
                padding: '0.6rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
