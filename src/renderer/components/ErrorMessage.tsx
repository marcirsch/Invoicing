export function ErrorMessage({ message }: { message: string }): JSX.Element {
  return <p role="alert">{message}</p>;
}
