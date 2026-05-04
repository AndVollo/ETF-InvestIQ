ObjC.import('AppKit');

function run(argv) {
    var inputPath = argv[0];
    var outputPath = argv[1];
    
    var img = $.NSImage.alloc.initWithContentsOfFile(inputPath);
    var tiffData = img.TIFFRepresentation;
    var bitmap = $.NSBitmapImageRep.alloc.initWithData(tiffData);
    
    var width = bitmap.pixelsWide;
    var height = bitmap.pixelsHigh;
    
    for (var x = 0; x < width; x++) {
        for (var y = 0; y < height; y++) {
            var color = bitmap.colorAtXY(x, y);
            // Green screen detection
            if (color.greenComponent > 0.7 && color.redComponent < 0.4 && color.blueComponent < 0.4) {
                bitmap.setColorAtXY($.NSColor.colorWithCalibratedRedGreenBlueAlpha(0, 0, 0, 0), x, y);
            }
        }
    }
    
    // Use an empty dictionary instead of null
    var properties = $.NSDictionary.dictionary;
    var pngData = bitmap.representationUsingTypeProperties($.NSPNGFileType, properties);
    pngData.writeToFileAtomically(outputPath, true);
}
