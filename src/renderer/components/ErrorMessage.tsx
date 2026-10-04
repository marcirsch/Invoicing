export function ErrorMessage({
  message,
  onReload,
}: {
  message: string;
  onReload?: () => void;
}): JSX.Element {
  return (
    <div className="error-banner" role="alert">
      <p>{message}</p>
      {onReload && (
        <button type="button" className="secondary" onClick={onReload}>
          Reload CSV
        </button>
      )}
    </div>
  );
}
