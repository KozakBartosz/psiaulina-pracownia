# Psiaulina · Pracownia

Prosta aplikacja desktopowa na Windows i macOS. React + TypeScript + Tauri 2, bez bazy danych i bez backendu sieciowego.

## Uruchomienie

Potrzebne: Node.js 22+, Rust stable oraz narzędzia systemowe Tauri (na macOS Xcode Command Line Tools; na Windows Microsoft C++ Build Tools i WebView2).

```sh
npm ci
npm run tauri dev
```

`npm run dev` uruchamia sam interfejs w przeglądarce w oznaczonym trybie demonstracyjnym. Pliki w demonstracji są tylko w pamięci i znikają po odświeżeniu. Rzeczywisty odczyt/zapis folderu jest dostępny w aplikacji desktopowej.

## Materiały

Wybierz lokalny folder. Aplikacja tworzy w nim trzy podfoldery, jeżeli ich brakuje:

```text
podsumowania/
wiedza/
szablon/
```

Zakładki pokazują pliki `.md` bezpośrednio z tych folderów, posortowane według daty modyfikacji. Podfoldery nie są przeszukiwane. Nazwa dokumentu jest nazwą pliku bez rozszerzenia. Zapis jest ręczny; zmiana nazwy następuje przy zapisie. Nowy dokument zaczyna się pusty. Treść szablonów przygotowuje użytkowniczka; aplikacja nie wstawia ich automatycznie.

Folder zostaje zapamiętany w ustawieniach systemowych aplikacji. Aplikacja co 2,5 sekundy odświeża listę i otwarty dokument, jeżeli nie ma lokalnych zmian. Przy zapisie porównuje zawartość pliku z wersją otwartą w edytorze i blokuje nadpisanie zmian zewnętrznych. Zapis korzysta z pliku tymczasowego w tym samym folderze. To nie jest historia wersji ani system synchronizacji; folder warto obejmować własną kopią zapasową.

Agent może pracować na tym samym katalogu. Plik `AGENTS.md` można umieścić w jego katalogu głównym. Nie jest on automatycznie tworzony ani modyfikowany przez aplikację.

## PDF

„Drukuj / PDF” eksportuje aktualną treść edytora (również przed zapisem Markdown) do pliku PDF, wskazując lokalizację przez okno zapisu. Dokument ma format A4, logo Psiauliny, pomarańczowy nagłówek i numerację stron. Czcionki z polskimi znakami są dołączone lokalnie; internet nie jest potrzebny. Papierową kopię można wydrukować z zapisanego PDF. Logo i nagłówek są elementem oprawy dokumentu i nie trzeba dopisywać ich do każdego `.md`.

Podgląd podsumowań i szablonów renderuje rzeczywiste strony PDF w formacie A4, z logo i numeracją na każdej stronie. Zmiany aktualizują go po krótkiej przerwie w pisaniu. Podgląd i eksport korzystają z tego samego generatora. Wiedza pozostaje czytelnym podglądem Markdown. Obsługiwane są akapity, nagłówki, listy, podstawowe tabele i linki. Osadzanie lokalnych obrazów w Markdown nie jest na razie obsługiwane. Logo pochodzi z dostarczonego pliku `public/logo.png`.

## Sprawdzenie i instalatory

```sh
npm run build
# Test interfejsu i eksportu PDF; wymaga Google Chrome:
npm test
# Aplikacja i instalator na bieżący system:
npm run tauri build
```

Jednorazowy instalator Windows x64 (NSIS) na Windowsie budujemy poleceniem `npm run tauri build -- --bundles nsis`. Na macOS można użyć obsługiwanej przez Tauri kompilacji krzyżowej: `npm run tauri build -- --bundles nsis --runner cargo-xwin --target x86_64-pc-windows-msvc` (wymaga celu Rust `x86_64-pc-windows-msvc`, cargo-xwin oraz LLVM/LLD z `llvm-rc` i NSIS). Wynik kompilacji krzyżowej powstaje w `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`. Nie jest potrzebny proces CI/CD. Instalator ma polski interfejs, instaluje program dla bieżącego użytkownika i zawiera bootstrapper WebView2, który w razie potrzeby pobiera runtime Microsoftu przez internet. Instalator nie jest podpisany certyfikatem. Przed potwierdzeniem zgodności należy sprawdzić go na Windowsie; testy przeglądarkowe na macOS nie zastępują instalacji i uruchomienia Windows.

Zakładka Wiedza pozwala przeglądać i edytować istniejące pliki. Dodawanie, zmiana nazwy i usuwanie wiedzy są zablokowane, aby zachować odnośniki. Nowe materiały dodaje użytkowniczka lub agent poza aplikacją. `AGENTS.md` w katalogu głównym może wskazywać te same pliki; przeglądarka nie tworzy i nie aktualizuje tych instrukcji automatycznie.

## Osobny katalog dla agenta

Kod źródłowy i zainstalowany program są oddzielone od katalogu materiałów. Agent tworzący podsumowania powinien otwierać wyłącznie katalog materiałów, np. `Dokumenty/Psiaulina`, zawierający `AGENTS.md`, `wiedza/`, `szablon/` i `podsumowania/`. W aplikacji wybiera się dokładnie ten sam katalog. Instrukcje AGENTS mogą wskazywać względne ścieżki do wiedzy i szablonów. Pliki programu nie muszą być dostępne w projekcie agenta. Sam wybór katalogu nie jest techniczną blokadą dostępu agenta do innych miejsc na dysku; uprawnienia i zakres jego pracy ustawia się oddzielnie.

Przycisk Ustawienia pod listą dokumentów pokazuje aktualny katalog materiałów i pozwala go zmienić. Wybór odbywa się w systemowym oknie aplikacji desktopowej. Przed zmianą katalogu aplikacja ostrzega o niezapisanych poprawkach; anulowanie pozostawia dotychczasowy folder i dokument. Wybrana ścieżka jest zapamiętywana przez aplikację.

Pasek formatowania nad edytorem pozwala pogrubiać zaznaczenie, ustawiać tytuł i nagłówek, przywracać akapit, tworzyć listy punktowane i numerowane oraz wstawiać link przez okno z nazwą i adresem. Dokument nadal jest zapisywany jako Markdown. Eksport i podgląd PDF używają lokalnej czcionki Noto Emoji na licencji SIL OFL (licencja w `public/NotoEmoji-LICENSE.txt`). Emoji w PDF i podglądzie są kolorowymi obrazkami generowanymi lokalnie z systemowej czcionki emoji. Font Noto Emoji zachowuje tekst i miejsce w układzie; obrazki są osadzane w PDF, więc wydruk nie wymaga czcionek odbiorcy.

Zapisane podsumowania można usunąć przyciskiem kosza obok eksportu PDF. Po potwierdzeniu plik Markdown trafia do systemowego Kosza. Osobno wyeksportowany PDF pozostaje na dysku. Usuwanie nie jest dostępne dla wiedzy i szablonów. Przy zmianie pliku na dysku aplikacja blokuje usunięcie starej wersji.

## Odstępy i ręczny podział stron

Przycisk „Odstępy” ustawia interlinię, odstęp po akapitach i odstęp nad nagłówkami dla całego dokumentu. „Nowa strona” wstawia w miejscu kursora osobny wiersz `<!-- pagebreak -->`; tekst po nim zaczyna kolejną kartkę A4, z nagłówkiem, logo i numeracją. Początkowe i końcowe puste fragmenty nie tworzą pustych kartek. Podział można usunąć z tekstu.

Ustawienia inne niż domyślne zapisują się na początku Markdown jako komentarz `<!-- psiaulina-layout {"lineHeight":1.5,"paragraphGap":10,"headingGap":11} -->`. Edytor ukrywa ten komentarz; agent może go odczytać i powinien zachować przy zmianach treści. Ustawienia nie są odrębną bazą danych. Dotyczą PDF i podglądu A4; czytnik wiedzy korzysta ze zwykłego formatowania HTML.

Interfejs, edytor Markdown i PDF korzystają z lokalnej czcionki Quicksand (SIL OFL, `public/Quicksand-LICENSE.txt`). Statyczne wagi 400–700 pochodzą z fontu zmiennego Google Fonts; warianty Oblique mają mechaniczne pochylenie. Nazwa wewnętrzna zmodyfikowanych plików to PsiaulinaSans, zgodnie z zastrzeżeniem nazwy w licencji. Tekst edytora ma rozmiar 14 px (10,5 pt w PDF), a interlinia odpowiada ustawieniom dokumentu.

Znaczniki list punktowanych i numerowanych są pomarańczowe. Przyciski „Brązowy” i „Pomarańczowy” na pasku formatowania zmieniają kolor zaznaczonego tekstu (bez zaznaczenia wstawiają tekst do zastąpienia). Kolor zapisuje się w Markdown jako `<span style="color:#482a30">tekst</span>` lub `<span style="color:#ff501b">tekst</span>`. Wewnątrz można używać pogrubienia i linków. Podgląd i PDF zachowują te kolory.

Jeśli w głównym katalogu materiałów istnieje `AGENTS.md`, zakładka Wiedza pokazuje go na pierwszym miejscu jako „Instrukcje główne”, z wyróżnieniem i separatorem. Można go czytać i edytować bez zmiany nazwy. Jest to plik z katalogu głównego, niezależny od ewentualnego `wiedza/AGENTS.md`. Aplikacja nie tworzy go automatycznie.
