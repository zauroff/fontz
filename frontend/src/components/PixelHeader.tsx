const ART = String.raw` ███████╗ ██████╗ ███╗   ██╗████████╗███████╗
 ██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝╚══███╔╝
 █████╗  ██║   ██║██╔██╗ ██║   ██║     ███╔╝
 ██╔══╝  ██║   ██║██║╚██╗██║   ██║    ███╔╝
 ██║     ╚██████╔╝██║ ╚████║   ██║   ███████╗
 ╚═╝      ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝`;

export function PixelHeader() {
  return (
    <header className="pixel-header" aria-label="Fontz">
      <pre className="pixel-art">{ART}</pre>
    </header>
  );
}
