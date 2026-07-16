import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  runApp(const LoremIpsumApp());
}

class LoremIpsumApp extends StatelessWidget {
  const LoremIpsumApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lorem Ipsum Generator',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const LoremIpsumGenerator(),
    );
  }
}

class LoremIpsumGenerator extends StatefulWidget {
  const LoremIpsumGenerator({super.key});

  @override
  State<LoremIpsumGenerator> createState() => _LoremIpsumGeneratorState();
}

class _LoremIpsumGeneratorState extends State<LoremIpsumGenerator> {
  final TextEditingController _paragraphController = TextEditingController();
  String _generatedText = '';
  bool _isCopied = false;

  // Standard Lorem Ipsum paragraph
  static const String _loremIpsumParagraph =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

  String _generateLoremIpsum(int paragraphs) {
    if (paragraphs <= 0) {
      return '';
    }
    return List.generate(paragraphs, (_) => _loremIpsumParagraph).join('\n\n');
  }

  void _generateText() {
    final int? paragraphCount = int.tryParse(_paragraphController.text);
    if (paragraphCount == null || paragraphCount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid number of paragraphs (greater than 0)'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _generatedText = _generateLoremIpsum(paragraphCount);
      _isCopied = false;
    });
  }

  void _copyToClipboard() {
    if (_generatedText.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No text to copy!'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    Clipboard.setData(ClipboardData(text: _generatedText));
    setState(() {
      _isCopied = true;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copied to clipboard!'),
        backgroundColor: Colors.green,
        duration: Duration(seconds: 2),
      ),
    );

    // Reset the copied state after 2 seconds
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _isCopied = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _paragraphController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lorem Ipsum Generator'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        elevation: 2,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Input section
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Number of Paragraphs',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _paragraphController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        hintText: 'Enter number (e.g., 3)',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.format_list_numbered),
                      ),
                      onSubmitted: (_) => _generateText(),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _generateText,
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Generate'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Output section
            if (_generatedText.isNotEmpty) ...[
              Expanded(
                child: Card(
                  elevation: 4,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header with copy button
                      Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Generated Text',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            IconButton.filled(
                              onPressed: _copyToClipboard,
                              icon: Icon(
                                _isCopied ? Icons.check : Icons.copy,
                              ),
                              tooltip: _isCopied ? 'Copied!' : 'Copy to clipboard',
                              style: IconButton.styleFrom(
                                backgroundColor: _isCopied ? Colors.green : null,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1),
                      // Scrollable text content
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(12.0),
                          child: SelectableText(
                            _generatedText,
                            style: const TextStyle(
                              fontSize: 16,
                              height: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ] else ...[
              const Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.text_fields,
                        size: 80,
                        color: Colors.grey,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Enter the number of paragraphs and tap Generate',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
