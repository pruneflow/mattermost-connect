//front: src/spaceUtils
export const doesSpaceExists = (spaceId, spaces) => {
  if (!spaces || spaces.length === 0) return false;
  return !!spaces.find((space) => space.id === spaceId);
};
