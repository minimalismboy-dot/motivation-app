import Cocoa
import WebKit

// MARK: - App Delegate

class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    var viewController: MotivationViewController!

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Create window
        let windowRect = NSRect(x: 0, y: 0, width: 420, height: 780)
        window = NSWindow(
            contentRect: windowRect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )

        window.title = "\u{041C}\u{043E}\u{0442}\u{0438}\u{0432}\u{0430}\u{0446}\u{0438}\u{044F}"
        window.minSize = NSSize(width: 320, height: 480)
        window.center()

        // Dark title bar
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(red: 0.1, green: 0.1, blue: 0.15, alpha: 1.0)
        window.appearance = NSAppearance(named: .darkAqua)

        // Set up view controller
        viewController = MotivationViewController()
        window.contentViewController = viewController

        window.makeKeyAndOrderFront(nil)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

// MARK: - View Controller

class MotivationViewController: NSViewController, WKNavigationDelegate, WKUIDelegate {
    var webView: WKWebView!

    override func loadView() {
        self.view = NSView(frame: NSRect(x: 0, y: 0, width: 420, height: 780))
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Configure WKWebView
        let config = WKWebViewConfiguration()
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        // Enable localStorage via data store
        let dataStore = WKWebsiteDataStore.default()
        config.websiteDataStore = dataStore

        // Allow media playback
        config.mediaTypesRequiringUserActionForPlayback = []

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self

        // Transparent background to match dark theme
        webView.setValue(false, forKey: "drawsBackground")

        view.addSubview(webView)

        loadLocalHTML()
    }

    func loadLocalHTML() {
        // Look for index.html next to the executable
        let executableURL = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent()
        let htmlURL = executableURL.appendingPathComponent("index.html")

        if FileManager.default.fileExists(atPath: htmlURL.path) {
            webView.loadFileURL(htmlURL, allowingReadAccessTo: executableURL)
        } else {
            // Fallback: look in current working directory
            let cwdURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            let cwdHTMLURL = cwdURL.appendingPathComponent("index.html")
            if FileManager.default.fileExists(atPath: cwdHTMLURL.path) {
                webView.loadFileURL(cwdHTMLURL, allowingReadAccessTo: cwdURL)
            } else {
                let errorHTML = """
                <html><body style="background:#1a1a2e;color:white;font-family:system-ui;display:flex;
                align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="text-align:center">
                <h1>index.html not found</h1>
                <p>Place index.html next to the MotivationApp executable.</p>
                <p>Searched:<br>\(htmlURL.path)<br>\(cwdHTMLURL.path)</p>
                </div></body></html>
                """
                webView.loadHTMLString(errorHTML, baseURL: nil)
            }
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        // Allow local file loading
        if url.isFileURL {
            decisionHandler(.allow)
            return
        }

        // Allow about:blank and similar
        if url.scheme == nil || url.scheme == "about" {
            decisionHandler(.allow)
            return
        }

        // Open external links (http/https) in default browser
        if url.scheme == "http" || url.scheme == "https" {
            // Allow YouTube embeds to load inside the webview
            if navigationAction.targetFrame != nil && navigationAction.targetFrame!.isMainFrame == false {
                decisionHandler(.allow)
                return
            }
            // Main frame external navigation -> open in browser
            if navigationAction.navigationType == .linkActivated {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
            return
        }

        decisionHandler(.allow)
    }

    // MARK: - WKUIDelegate (JS alerts, confirms, prompts)

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        let response = alert.runModal()
        completionHandler(response == .alertFirstButtonReturn)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert()
        alert.messageText = prompt
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")

        let textField = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        textField.stringValue = defaultText ?? ""
        alert.accessoryView = textField

        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            completionHandler(textField.stringValue)
        } else {
            completionHandler(nil)
        }
    }

    // Allow new windows (target="_blank") to open in browser
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, (url.scheme == "http" || url.scheme == "https") {
            NSWorkspace.shared.open(url)
        }
        return nil
    }
}

// MARK: - Main

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate

// Set activation policy to regular (shows in dock)
app.setActivationPolicy(.regular)
app.activate(ignoringOtherApps: true)

app.run()
