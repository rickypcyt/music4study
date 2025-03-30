declare module 'react-bubble-ui' {
  interface BubbleUIOptions {
    size: number;
    minSize: number;
    gutter: number;
    provideProps: boolean;
    numCols: number;
    fringeWidth: number;
    yRadius: number;
    xRadius: number;
    cornerRadius: number;
    showGuides: boolean;
    compact: boolean;
    gravitation: number;
  }

  interface BubbleUIProps {
    options: BubbleUIOptions;
    className?: string;
    children: React.ReactNode;
  }

  const BubbleUI: React.FC<BubbleUIProps>;
  export default BubbleUI;
} 