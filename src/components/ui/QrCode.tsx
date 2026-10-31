/**
 * QR Code — rendu SVG, sans appel réseau.
 *
 * Le reçu doit rester vérifiable même si le client scanne le papier des mois
 * plus tard : le QR est donc calculé localement (aucun service externe à
 * joindre) et encode l'adresse de la page de vérification.
 *
 * `qrcode-generator` est une bibliothèque MIT de Kazuhiko Arase, embarquée au
 * moment de la compilation.
 */
import React, { useMemo } from 'react';
import qrcode from 'qrcode-generator';

interface Props {
  value: string;
  /** Taille en pixels du carré affiché. */
  size?: number;
  /** Marge blanche autour du motif (en modules). */
  margin?: number;
  className?: string;
  title?: string;
}

export function QrCode({ value, size = 96, margin = 2, className, title }: Props) {
  const modules = useMemo(() => {
    if (!value) return null;
    try {
      // Niveau de correction « M » : bon compromis taille / résistance aux
      // taches d'encre ou à un pli du papier. L'URL est courte, donc la
      // version 0 (auto) suffit largement.
      const qr = qrcode(0, 'M');
      qr.addData(value);
      qr.make();
      return { count: qr.getModuleCount(), isDark: (r: number, c: number) => qr.isDark(r, c) };
    } catch {
      return null;
    }
  }, [value]);

  if (!modules) return null;

  const total = modules.count + margin * 2;
  const cells: React.ReactNode[] = [];
  for (let row = 0; row < modules.count; row += 1) {
    for (let col = 0; col < modules.count; col += 1) {
      if (modules.isDark(row, col)) {
        cells.push(
          <rect
            key={`${row}-${col}`}
            x={col + margin}
            y={row + margin}
            width={1}
            height={1}
            fill="#0b1220"
          />
        );
      }
    }
  }

  return (
    <svg
      role="img"
      aria-label={title || 'QR code de vérification du reçu'}
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
    >
      {title ? <title>{title}</title> : null}
      <rect x={0} y={0} width={total} height={total} fill="#ffffff" />
      {cells}
    </svg>
  );
}
