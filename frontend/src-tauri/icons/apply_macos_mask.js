ObjC.import('AppKit');

function run(argv) {
    var inputPath = argv[0];
    var outputPath = argv[1];
    
    var img = $.NSImage.alloc.initWithContentsOfFile(inputPath);
    var canvasSize = $.NSMakeSize(1024, 1024);
    
    var offscreen = $.NSImage.alloc.initWithSize(canvasSize);
    offscreen.lockFocus;
    
    // Clear background
    $.NSColor.clearColor.set;
    $.NSRectFill($.NSMakeRect(0, 0, 1024, 1024));
    
    // Official macOS App Icon Standard: 824x824 icon area inside 1024x1024 canvas
    var iconSize = 824;
    var offset = (1024 - iconSize) / 2; // 100 pixels padding on each side
    var radius = 176; // Official Apple radius for app icons
    
    var path = $.NSBezierPath.bezierPath;
    path.appendBezierPathWithRoundedRectXRadiusYRadius(
        $.NSMakeRect(offset, offset, iconSize, iconSize), radius, radius
    );
    path.addClip;
    
    // Draw the image scaled down to the standard 824px area
    img.drawInRect($.NSMakeRect(offset, offset, iconSize, iconSize));
    
    var bitmap = $.NSBitmapImageRep.alloc.initWithFocusedViewRect($.NSMakeRect(0, 0, 1024, 1024));
    offscreen.unlockFocus;
    
    var pngData = bitmap.representationUsingTypeProperties($.NSPNGFileType, $.NSDictionary.dictionary);
    pngData.writeToFileAtomically(outputPath, true);
}
