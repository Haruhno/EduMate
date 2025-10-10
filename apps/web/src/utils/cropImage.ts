export const getCroppedImg = (imageSrc: string, pixelCrop: any): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const { x, y, width, height } = pixelCrop;
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(image, x, y, width, height, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    image.onerror = reject;
  });
};
