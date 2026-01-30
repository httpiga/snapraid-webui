interface PageLoadingProps {
  message: string;
}

export function PageLoading({ message }: PageLoadingProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">{message}</div>
    </div>
  );
}
