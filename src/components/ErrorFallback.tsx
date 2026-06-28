interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
      <div className="border-2 border-destructive bg-destructive/10 p-8 max-w-lg text-center space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-destructive">
          出错了
        </h2>
        <p className="text-sm text-muted-foreground break-all">
          {error.message}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-2 border-2 border-border bg-background text-foreground hover:bg-primary hover:text-black hover:border-primary rounded-none uppercase tracking-widest text-xs font-bold"
        >
          重试
        </button>
      </div>
    </div>
  );
}
