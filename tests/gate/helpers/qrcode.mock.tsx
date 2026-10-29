// tests/gate/helpers/qrcode.mock.tsx
import React from 'react';

export const QRCode = (props: any) =>
  React.createElement('div', { 'data-testid': 'qr-code', 'data-value': props.value });

export const QRCodeCanvas = (props: any) =>
  React.createElement('canvas', { 'data-testid': 'qr-canvas', 'data-value': props.value });

export const QRCodeSVG = (props: any) =>
  React.createElement('svg', { 'data-testid': 'qr-svg', 'data-value': props.value });
