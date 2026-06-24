declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: { unit?: string; format?: string | number[]; orientation?: string });
    setFontSize(size: number): void;
    setFont(font: string, style?: string): void;
    setFillColor(r: number, g: number, b: number): void;
    setTextColor(r: number, g: number, b: number): void;
    text(text: string, x: number, y: number, options?: { align?: string }): void;
    rect(x: number, y: number, w: number, h: number, style?: string): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    splitTextToSize(text: string, maxWidth: number): string[];
    output(type: string): Blob;
    save(filename: string): void;
    addPage(): void;
    internal: { pageSize: { getWidth(): number; getHeight(): number } };
  }
}
