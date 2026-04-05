import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-xl border-white/10 bg-white/5">
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">Game</Badge>
          <CardTitle className="text-3xl">Partie #{id}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Coming soon.
        </CardContent>
      </Card>
    </main>
  );
}
