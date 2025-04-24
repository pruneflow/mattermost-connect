// src/providers/ErrorProvider.tsx
/**
 * Provider pour la gestion centralisée des erreurs
 * Expose les fonctionnalités de reporting d'erreurs et de notifications
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useServices } from "./ServicesProvider";
import { ErrorContext, ErrorContextValue } from "./contexts";
import { EnhancedError } from "../core/services/error.service";

/**
 * Propriétés du provider d'erreurs
 */
interface ErrorProviderProps {
  /** Enfants du provider */
  children: ReactNode;

  /** Nombre maximal d'erreurs à conserver */
  maxErrors?: number;

  /** Callback appelé lorsqu'une erreur est rapportée */
  onError?: (error: Error, context?: any) => void;

  /** Effacer automatiquement les erreurs après un délai */
  autoClearErrors?: boolean;

  /** Délai avant effacement automatique (ms) */
  autoClearDelay?: number;
}

/**
 * Hook pour accéder au contexte d'erreurs
 *
 * @returns Contexte d'erreurs
 * @throws Error si utilisé en dehors d'un ErrorProvider
 */
export function useError(): ErrorContextValue {
  const context = React.useContext(ErrorContext);

  if (!context) {
    throw new Error("useError must be used within an ErrorProvider");
  }

  return context;
}

/**
 * Provider pour la gestion centralisée des erreurs
 *
 * @example
 * ```tsx
 * <ErrorProvider
 *   maxErrors={5}
 *   onError={(error) => console.log(`Error occurred: ${error.message}`)}
 *   autoClearErrors={true}
 *   autoClearDelay={10000}
 * >
 *   <App />
 * </ErrorProvider>
 * ```
 */
export function ErrorProvider({
  children,
  maxErrors = 10,
  onError,
  autoClearErrors = false,
  autoClearDelay = 10000,
}: ErrorProviderProps): JSX.Element {
  const { errorService } = useServices();
  const [lastError, setLastError] = useState<EnhancedError | null>(null);
  const [recentErrors, setRecentErrors] = useState<
    Array<{
      error: EnhancedError;
      timestamp: number;
      context?: any;
    }>
  >([]);

  // S'abonner aux erreurs reportées par le service
  useEffect(() => {
    const handleError = (error: Error, context?: any) => {
      const enhancedError = error as EnhancedError;

      // Mettre à jour la dernière erreur
      setLastError(enhancedError);

      // Ajouter à la liste des erreurs récentes
      setRecentErrors((prev) => {
        const newErrors = [
          {
            error: enhancedError,
            timestamp: Date.now(),
            context,
          },
          ...prev,
        ].slice(0, maxErrors);

        return newErrors;
      });

      // Appeler le callback si fourni
      if (onError) {
        onError(error, context);
      }
    };

    // S'abonner au service d'erreurs
    const unsubscribe = errorService.registerHandler(handleError);

    // Initialiser avec les erreurs récentes du service
    const initialErrors = errorService.getRecentErrors();
    if (initialErrors.length > 0) {
      setRecentErrors(initialErrors.slice(0, maxErrors));
      setLastError(initialErrors[0]?.error || null);
    }

    return unsubscribe;
  }, [errorService, maxErrors, onError]);

  // Effacement automatique des erreurs
  useEffect(() => {
    if (autoClearErrors && lastError && autoClearDelay > 0) {
      const timer = setTimeout(() => {
        clearErrors();
      }, autoClearDelay);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [lastError, autoClearErrors, autoClearDelay]);

  // Fonction pour reporter une erreur
  const reportError = useCallback(
    (error: Error, context?: any) => {
      errorService.handleError(error, context);
    },
    [errorService],
  );

  // Fonction pour effacer les erreurs
  const clearErrors = useCallback(() => {
    setLastError(null);
    setRecentErrors([]);
    errorService.clearErrors();
  }, [errorService]);

  // Fonction pour s'abonner aux erreurs
  const subscribeToErrors = useCallback(
    (handler: (error: Error, context?: any) => void) => {
      return errorService.registerHandler(handler);
    },
    [errorService],
  );

  // Valeur du contexte mémoïsée
  const contextValue = useMemo<ErrorContextValue>(
    () => ({
      lastError,
      recentErrors,
      reportError,
      clearErrors,
      subscribeToErrors,
    }),
    [lastError, recentErrors, reportError, clearErrors, subscribeToErrors],
  );

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * Higher-order component pour capturer les erreurs dans les composants
 *
 * @param Component Composant à protéger
 * @returns Composant protégé qui capturera les erreurs
 *
 * @example
 * ```tsx
 * const SafeComponent = withErrorHandling(MyComponent);
 *
 * // Utilisation
 * <SafeComponent someProp={value} />
 * ```
 */
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    const { reportError } = useError();

    try {
      return <Component {...props} />;
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), {
        component: Component.displayName || Component.name,
      });

      // Afficher un fallback en cas d'erreur
      return (
        <div className="error-boundary">
          <h3>Something went wrong</h3>
          <p>The component could not be rendered due to an error.</p>
        </div>
      );
    }
  };

  WrappedComponent.displayName = `WithErrorHandling(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Propriétés du ErrorBoundary
 */
interface ErrorBoundaryProps {
  /** Enfants du boundary */
  children: ReactNode;

  /** Composant de fallback à afficher en cas d'erreur */
  fallback?:
    | React.ReactNode
    | ((error: Error, resetError: () => void) => React.ReactNode);

  /** Callback appelé lorsqu'une erreur est capturée */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /** Service d'erreurs pour le reporting */
  errorService?: { handleError: (error: Error, context?: any) => void };
}

/**
 * État du ErrorBoundary
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Context pour partager le service d'erreurs avec les ErrorBoundary
 */
const ErrorBoundaryContext = React.createContext<{
  errorService: { handleError: (error: Error, context?: any) => void } | null;
}>({
  errorService: null,
});

/**
 * Provider pour le contexte ErrorBoundary
 */
export function ErrorBoundaryProvider({
  children,
  errorService,
}: {
  children: ReactNode;
  errorService: { handleError: (error: Error, context?: any) => void };
}) {
  return (
    <ErrorBoundaryContext.Provider value={{ errorService }}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
}

/**
 * Boundary d'erreur qui capture les erreurs dans la hiérarchie des composants
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <h2>Something went wrong</h2>
 *       <p>{error.message}</p>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  static contextType = ErrorBoundaryContext;
  context!: React.ContextType<typeof ErrorBoundaryContext>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Utiliser le service d'erreurs si fourni via props ou contexte
    const errorService = this.props.errorService || this.context?.errorService;

    if (errorService) {
      errorService.handleError(error, {
        source: "ErrorBoundary",
        componentStack: errorInfo.componentStack,
      });
    }

    // Appeler le callback onError si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    const { children, fallback } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (typeof fallback === "function") {
        return fallback(error, this.resetError);
      } else if (fallback) {
        return fallback;
      } else {
        return (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <p>{error.message}</p>
            <button onClick={this.resetError}>Try again</button>
          </div>
        );
      }
    }

    return children;
  }
}

/**
 * Wrapper pour ErrorBoundary qui utilise le service d'erreurs du ErrorProvider
 */
export function ConnectedErrorBoundary(
  props: Omit<ErrorBoundaryProps, "errorService">,
): JSX.Element {
  const { errorService } = useServices();

  return <ErrorBoundary {...props} errorService={errorService} />;
}
