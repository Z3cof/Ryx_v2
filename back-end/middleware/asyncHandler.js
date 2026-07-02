/**
 * Garantit qu'une erreur dans une route async envoie toujours une réponse JSON.
 * Sans ça, Express ne renvoie rien et le client reçoit une réponse vide.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error('asyncHandler:', err);
      next(err);
    });
  };
}

module.exports = asyncHandler;
