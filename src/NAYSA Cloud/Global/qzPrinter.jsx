import qz from "qz-tray";

export const connectQZ = async () => {
  if (qz.websocket.isActive()) {
    return true;
  }

  await qz.websocket.connect({
    retries: 3,
    delay: 1,
  });

  return true;
};

export const disconnectQZ = async () => {
  if (qz.websocket.isActive()) {
    await qz.websocket.disconnect();
  }
};

export const getQZPrinters = async () => {
  await connectQZ();
  return await qz.printers.find();
};

export const printQZHtml = async ({
  printerName,
  html,
  width = 90,
  height = 50,
  orientation = "landscape",
}) => {
  await connectQZ();

  const config = qz.configs.create(printerName, {
    units: "mm",
    size: {
      width,
      height,
    },
    margins: 0,
    orientation,
    scaleContent: false,
  });

  const data = [
    {
      type: "pixel",
      format: "html",
      flavor: "plain",
      data: html,
    },
  ];

  return await qz.print(config, data);
};

export const printQZImage = async ({
  printerName,
  imageBase64,
  width = 90,
  height = 50,
  orientation = "landscape",
}) => {
  await connectQZ();

  const config = qz.configs.create(printerName, {
    units: "mm",
    size: {
      width,
      height,
    },
    margins: 0,
    orientation,
    scaleContent: false,
  });

  const data = [
    {
      type: "pixel",
      format: "image",
      flavor: "base64",
      data: imageBase64.replace(/^data:image\/png;base64,/, ""),
    },
  ];

  return await qz.print(config, data);
};

export const printQZZpl = async ({ printerName, zpl }) => {
  await connectQZ();

  const config = qz.configs.create(printerName);

  const data = [
    {
      type: "raw",
      format: "command",
      flavor: "plain",
      data: zpl,
    },
  ];

  return await qz.print(config, data);
};