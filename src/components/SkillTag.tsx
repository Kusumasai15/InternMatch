export default function Tag({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}

