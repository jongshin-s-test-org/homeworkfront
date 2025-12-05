import { NextConfig } from 'next';
import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
  // CORS 이슈 방지를 위한 헤더 설정
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },

  // webpack: (config, { isServer, webpack }) => {
    
  //   // 1. CKEditor 5의 SVG 로더 설정:
  //   // Next.js의 기본 SVG 로더가 CKEditor의 아이콘 SVG를 처리하지 못하도록 제외합니다.
  //   const svgRule = config.module.rules.find(rule => 
  //       rule.test && rule.test instanceof RegExp && rule.test.test('.svg')
  //   );
    
  //   if (svgRule && typeof svgRule !== 'string' && svgRule.loader) {
  //       // 기존 SVG 로더에서 CKEditor 관련 SVG 파일을 제외
  //       svgRule.exclude = /\.svg$/i; 
  //   }

  //   // 2. CKEditor 5 전용 로더 추가:
  //   // CKEditor 5는 자체적으로 SVG 파일을 raw-loader로 처리해야 합니다.
  //   config.module.rules.push(
  //     {
  //       test: /\.svg$/,
  //       include: [
  //           // CKEditor 5 모듈 내의 SVG만 처리하도록 경로 지정 (선택적)
  //           path.resolve(__dirname, 'node_modules', '@ckeditor'),
  //           // 혹은 보다 일반적인 방식:
  //           /ckeditor5-[^/]+\/theme\/icons\/[^/]+\.svg$/,
  //       ],
  //       use: [ 'raw-loader' ],
  //     },
  //     {
  //       // 일반적인 파일 로더 (필요한 경우)
  //       test: /ckeditor5-[^/]+\/theme\/icons\/[^/]+\.svg$/,
  //       use: [ 'raw-loader' ]
  //     }
  //   );

  //   // 3. 종속성 중복 제거 (Type Mismatch 해결 시도):
  //   // isServer가 아닐 때 (클라이언트 측 번들링) 핵심 CKEditor 패키지가 
  //   // 하나의 경로에서 로드되도록 alias를 설정하여 타입 충돌을 완화합니다.
  //   if (!isServer) {
  //       config.resolve.alias = {
  //           ...config.resolve.alias,
  //           // '@ckeditor/ckeditor5-core'가 프로젝트의 루트 node_modules에서 로드되도록 강제
  //           '@ckeditor/ckeditor5-core': path.resolve(__dirname, 'node_modules', '@ckeditor/ckeditor5-core'),
  //           // 필요한 경우 다른 핵심 패키지 추가 (예: watchdog)
  //           // '@ckeditor/ckeditor5-watchdog': path.resolve(__dirname, 'node_modules', '@ckeditor/ckeditor5-watchdog')
  //       };
  //   }

  //   return config;
  // },
};

module.exports = nextConfig;