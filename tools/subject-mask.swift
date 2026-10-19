// The piece in a packshot, as a greyscale mask (white = piece), from the
// subject lifting built into macOS (Vision, macOS 14+). Used by
// tools/fj-reground.py; compiled on the fly there.
//
//   subject-mask <in.png> <out-mask.png>
import CoreImage
import Foundation
import ImageIO
import Vision

let args = CommandLine.arguments
guard args.count == 3,
      let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
  FileHandle.standardError.write("usage: subject-mask <in> <out-mask.png>\n".data(using: .utf8)!)
  exit(1)
}
let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: image)
try handler.perform([request])
guard let result = request.results?.first else {
  FileHandle.standardError.write("no subject found\n".data(using: .utf8)!)
  exit(2)
}
let mask = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
try CIContext().writePNGRepresentation(
  of: CIImage(cvPixelBuffer: mask), to: URL(fileURLWithPath: args[2]),
  format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
