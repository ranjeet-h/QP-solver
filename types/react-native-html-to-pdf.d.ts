declare module 'react-native-html-to-pdf' {
  interface RNHTMLtoPDFOptions {
    html: string;
    fileName?: string;
    width?: number;
    height?: number;
    directory?: string;
    base64?: boolean;
  }

  interface RNHTMLtoPDFResponse {
    filePath: string;
    uri: string;
    base64?: string;
  }

  interface RNHTMLtoPDF {
    convert(options: RNHTMLtoPDFOptions): Promise<RNHTMLtoPDFResponse>;
  }

  const RNHTMLtoPDF: RNHTMLtoPDF;
  export default RNHTMLtoPDF;
} 