import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-xl border-white/10 bg-white/5">
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">Auth</Badge>
          <CardTitle className="text-3xl">Inscription</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Coming soon.
        </CardContent>
      </Card>
    </main>
  );
}
