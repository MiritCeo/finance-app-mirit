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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Zasady grywalizacji w Mirit
          </CardTitle>
          <CardDescription>
            Krótkie wyjaśnienie po co jest system punktów, jak działa i za co możesz zdobywać
            nagrody.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            System grywalizacji ma pomóc nam w trzech obszarach:{" "}
            <span className="font-semibold">
              lepsza współpraca, stabilność finansowa firmy i większe poczucie wpływu
            </span>{" "}
            każdego pracownika.
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
              <span className="font-semibold">1000 punktów</span> awansujesz na kolejny poziom. Na
              karcie grywalizacji zobaczysz ile brakuje Ci do następnego poziomu.
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
            System oparty na geolokalizacji i czasie spędzonym w biurze – bez kar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>
              W zakładce <span className="font-semibold">„Obecność w biurze”</span> rozpoczynasz i
              kończysz <span className="font-semibold">sesję biurową</span>.
            </li>
            <li>
              System sprawdza, czy jesteś w zdefiniowanym obszarze biura (na podstawie GPS) oraz
              ile czasu minęło między startem a zakończeniem.
            </li>
            <li>
              Jeśli sesja spełni minimalny czas (np.{" "}
              <span className="font-semibold">4h w biurze w ciągu dnia</span>), dostajesz{" "}
              <span className="font-semibold">punkty za dzień</span>.
            </li>
            <li>
              Za serię kolejnych dni spełniających warunki możesz otrzymać{" "}
              <span className="font-semibold">dodatkowe punkty za „streak”</span>.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Dokładne wartości (ile punktów za dzień i za serię) są konfigurowane przez
            administratora firmy i mogą się zmieniać, ale zawsze działają na zasadzie:{" "}
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
            Automatyczne punkty miesięczne na podstawie raportowanych godzin – zgodnie z V3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Raz na jakiś czas (np. po zakończeniu miesiąca) administrator może{" "}
            <span className="font-semibold">przeliczyć punkty za godziny</span> na podstawie
            raportów miesięcznych.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>1 punkt za każdą zaraportowaną godzinę do 160h miesięcznie,</li>
            <li>160–180h: +0.5 pkt za każdą godzinę powyżej 160h,</li>
            <li>180–200h: +1 pkt za każdą godzinę powyżej 180h,</li>
            <li>200h+: +1.5 pkt za każdą godzinę powyżej 200h.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Punkty są naliczane na podstawie oficjalnych danych z systemu (time tracking /
            raporty), nie subiektywnych ocen. Nie trzeba nic klikać ręcznie – system zaciąga dane
            z raportów.
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
            System, który nagradza planowanie z wyprzedzeniem i unikanie „dziur” w obsadzie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>
              W części grywalizacji możesz <span className="font-semibold">zaplanować urlop</span>{" "}
              i od razu zobaczyć, ile punktów taki plan Ci przyniesie.
            </li>
            <li>
              System nagradza:
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
            <span className="font-semibold">Nie ma żadnych kar</span> za urlopy – jeśli termin
            będzie mniej korzystny dla firmy, po prostu nie dostaniesz dodatkowych punktów.
            Najgorszy scenariusz to „0 punktów”, nigdy minus.
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
            Nagradzamy dzielenie się wiedzą wewnątrz firmy – artykuły w bazie wiedzy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>
              Jeśli dodasz artykuł do <span className="font-semibold">bazy wiedzy</span> jako
              pracownik, system może przyznać Ci punkty za wkład.
            </li>
            <li>
              W przyszłości będzie można dodawać dodatkowe punkty za popularność artykułu (liczba
              odczytów, komentarze, oznaczenie jako „innowacja” przez admina).
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
            Wspólne wyzwania godzinowe i zadaniowe – indywidualne, zespołowe i firmowe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="font-semibold">Questy</span> – to mniejsze wyzwania (np. indywidualne
              lub zespołowe), z jasno określonym celem (liczba godzin, liczba artykułów, itp.) i
              nagrodą punktową.
            </li>
            <li>
              <span className="font-semibold">Cele zespołowe</span> – większe cele oparte na
              godzinach (np. zespół/cała firma ma zrealizować X godzin w miesiącu lub kwartale).
            </li>
            <li>
              Po osiągnięciu celu punkty mogą być dzielone równo lub proporcjonalnie do wkładu –{" "}
              bez ujawniania szczegółowych danych finansowych innych osób.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Dokładne questy i cele będą ogłaszane przez właścicieli / liderów – ta część systemu
            jest elastyczna i możemy ją dopasowywać do aktualnych potrzeb firmy.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Odznaki (badges) – w przygotowaniu
          </CardTitle>
          <CardDescription>
            Odznaki są dodatkowymi wyróżnieniami za długoterminową konsekwencję i wkład.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Techniczna podstawa pod odznaki jest już w systemie. W kolejnych etapach możemy
            włączyć np.:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>„Consistent” – kilka miesięcy z rzędu z pełną liczbą godzin,</li>
            <li>„Streak Master” – długie serie dni w biurze,</li>
            <li>„Knowledge Contributor” – wiele artykułów w bazie wiedzy,</li>
            <li>„Innovation Master” – wyróżnione innowacyjne rozwiązania.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Gdy odznaki będą aktywne, pojawią się w Twoim profilu grywalizacji. Będą one widoczne
            tylko wewnętrznie – nie planujemy publicznych rankingów, które mogłyby wprowadzać
            niepotrzebną rywalizację.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


