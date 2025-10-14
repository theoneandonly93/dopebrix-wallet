// Simple bonding curve helpers

export const Curve = {
  // Linear: price = a + b * supply
  linear: (a, b, supply) => a + b * supply,
  // Constant product x*y=k. Given reserveX, reserveY, deltaX -> get outputY
  cpmmOut: (reserveX, reserveY, deltaX, feeBps = 30) => {
    const fee = (10000 - feeBps) / 10000;
    const dx = deltaX * fee;
    const k = reserveX * reserveY;
    const newX = reserveX + dx;
    const newY = k / newX;
    return reserveY - newY;
  }
};

