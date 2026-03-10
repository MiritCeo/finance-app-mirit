import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  MapPin,
  Clock,
  Calendar,
  BookOpen,
  Plane,
  Target,
  Users,
  Trophy,
} from "lucide-react";

export default function GamificationGuide() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm border-l-4 border-l-primary/40 page-hero">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">Zasady Mirit Points</h1>
              <p className="text-muted-foreground">
                Najważniejsze informacje o punktach, poziomach i nagrodach
              </p>
            </div>
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Zasady Mirit Points
          </CardTitle>
          <CardDescription>
            Krótkie wyjaśnienie po co jest system punktów, jak działa i za co możesz zdobywać
            nagrody.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            System Mirit Points ma pomóc nam w trzech obszarach:{" "}
            <span className="font-semibold">
              lepsza współpraca, stabilność finansowa firmy i większe poczucie wpływu
            </span>{" "}
            każdego pracownika.
          </p>
          <p className="text-xs text-muted-foreground">
            Koncept Mirit Points jest w fazie przemyśleń – opisane zasady to luźne założenia i mogą
            ulec zmianie.
          </p>
          <p>
            Punkty nigdy nie służą do karania ani do porównywania ludzi publicznie.{" "}
            <span className="font-semibold">
              To narzędzie motywacyjne i informacyjne – ma nagradzać dobre nawyki
            </span>{" "}
            (np. rozsądne planowanie urlopów, obecność w biurze, dzielenie się wiedzą), a nie
            wywoływać presję.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Poziomy i punkty – jak to działa?</CardTitle>
          <CardDescription>Prosty system poziomów oparty na łącznej liczbie punktów.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="space-y-2">
            <p>
              <Badge variant="outline">Poziomy</Badge>
            </p>
            <p>
              Każdy pracownik ma <span className="font-semibold">poziom</span> oraz{" "}
              <span className="font-semibold">łączne punkty</span>. Im więcej punktów zbierzesz,
              tym wyższy poziom.
            </p>
            <p>
              Progi poziomów są proste: mniej więcej co{" "}
              <span className="font-semibold">1000 punktów</span> awansujesz na kolejny poziom. W
              panelu Mirit Points zobaczysz ile brakuje Ci do następnego poziomu.
            </p>
          </div>
          <div className="space-y-2">
            <p>
              <Badge variant="outline">Skąd biorą się punkty?</Badge>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>obecność w biurze (sesje biurowe),</li>
              <li>godziny pracy raportowane w systemie,</li>
              <li>udział w questach / celach zespołowych,</li>
              <li>dzielenie się wiedzą w bazie wiedzy,</li>
              <li>rozsądne planowanie urlopów.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Punkty za obecność w biurze
          </CardTitle>
          <CardDescription>
            Pomysł nagradzania obecności w biurze — bez kar i bez presji.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>
              Jeśli uruchomimy ten pomysł, obecność będzie potwierdzana krótką sesją w zakładce{" "}
              <span className="font-semibold">„Obecność w biurze”</span>.
            </li>
            <li>
              Rozważamy weryfikację obecności na podstawie lokalizacji i czasu spędzonego w biurze.
            </li>
            <li>
              Punkty byłyby przyznawane po spełnieniu minimalnego czasu (np.{" "}
              <span className="font-semibold">4h w biurze w ciągu dnia</span>).
            </li>
            <li>
              Dodatkowo rozważamy bonus za regularność (serię dni spełniających warunki).
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Dokładne wartości i progi to jeszcze otwarta decyzja firmy — kluczowa zasada to{" "}
            <span className="font-semibold">tylko nagrody, żadnych kar</span>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Punkty za godziny pracy
          </CardTitle>
          <CardDescription>
            Pomysł na punkty miesięczne w oparciu o raportowane godziny.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Rozważamy, aby po zakończeniu miesiąca naliczać punkty na podstawie raportowanych
            godzin.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>1 punkt za każdą zaraportowaną godzinę do 160h miesięcznie,</li>
            <li>160–180h: +0.5 pkt za każdą godzinę powyżej 160h,</li>
            <li>180–200h: +1 pkt za każdą godzinę powyżej 180h,</li>
            <li>200h+: +1.5 pkt za każdą godzinę powyżej 200h.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            To propozycja firmy — jeśli ją wdrożymy, punkty będą wynikały z danych raportowych, bez
            ręcznego „odhaczania”.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-600" />
            Planowanie urlopów – bez kar, tylko nagrody
          </CardTitle>
          <CardDescription>
            Pomysł nagradzania planowania z wyprzedzeniem i unikania „dziur” w obsadzie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>
              Jeśli ten pomysł uruchomimy, planowanie urlopu pokaże orientacyjną liczbę punktów.
            </li>
            <li>
              Chcemy nagradzać:
              <ul className="list-disc list-inside ml-5 space-y-1">
                <li>
                  planowanie z wyprzedzeniem (3+ mies., 2 mies., 1 mies. – im wcześniej, tym więcej
                  punktów),
                </li>
                <li>rozłożenie urlopu na kilka części zamiast jednego bardzo długiego bloku,</li>
                <li>wybór terminu z mniejszym „konfliktem” (mniej osób na urlopie).</li>
              </ul>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">Nie planujemy żadnych kar</span> — mniej korzystny termin
            oznacza po prostu mniej lub zero punktów, nigdy minus.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Punkty za wiedzę (baza wiedzy)
          </CardTitle>
          <CardDescription>
            Pomysł nagradzania dzielenia się wiedzą wewnątrz firmy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>
              Planujemy premiować tworzenie artykułów w <span className="font-semibold">bazie wiedzy</span>.
            </li>
            <li>
              Rozważamy dodatkowe punkty za realny wpływ artykułu (np. przydatność lub uznanie przez
              zespół).
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Celem jest budowa „wewnętrznej Wikipedii Mirit” – im więcej przydatnej wiedzy, tym
            łatwiej pracuje się zarówno nowym, jak i doświadczonym osobom.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Questy i cele zespołowe
          </CardTitle>
          <CardDescription>
            Pomysł na wspólne wyzwania godzinowe i zadaniowe — indywidualne, zespołowe i firmowe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="font-semibold">Questy</span> – mniejsze wyzwania z jasnym celem i
              nagrodą punktową.
            </li>
            <li>
              <span className="font-semibold">Cele zespołowe</span> – większe cele, które wzmacniają
              współpracę całego zespołu.
            </li>
            <li>
              Model podziału punktów ustalimy tak, by był fair i bez porównywania prywatnych danych.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Konkretne questy i cele będą wynikiem decyzji firmy — ta część ma być elastyczna i
            dopasowana do aktualnych potrzeb.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Odznaki (badges) – pomysł na przyszłość
          </CardTitle>
          <CardDescription>
            Odznaki są dodatkowymi wyróżnieniami za długoterminową konsekwencję i wkład.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Rozważamy wprowadzenie odznak jako dodatkowego wyróżnienia. Potencjalne przykłady:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>„Consistent” – kilka miesięcy z rzędu z pełną liczbą godzin,</li>
            <li>„Streak Master” – długie serie dni w biurze,</li>
            <li>„Knowledge Contributor” – wiele artykułów w bazie wiedzy,</li>
            <li>„Innovation Master” – wyróżnione innowacyjne rozwiązania.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Jeśli zdecydujemy się je wdrożyć, odznaki będą widoczne tylko wewnątrz firmy — bez
            publicznych rankingów i zbędnej rywalizacji.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


